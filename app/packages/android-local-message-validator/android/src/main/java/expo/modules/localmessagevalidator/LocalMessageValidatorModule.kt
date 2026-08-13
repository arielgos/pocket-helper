package expo.modules.localmessagevalidator

import android.content.Context
import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class LocalMessageValidatorModule : Module() {
  private val languageIdentifier by lazy {
    LanguageIdentification.getClient()
  }

  private val modelPath by lazy {
    resolveModelPath()
  }

  private val llmInference by lazy {
    LlmInference.createFromOptions(
      requireNotNull(appContext.reactContext) { "React context is not available." },
      LlmInference.LlmInferenceOptions.builder()
        .setModelPath(modelPath)
        .setMaxTokens(512)
        .setMaxTopK(32)
        .build()
    )
  }

  // A new session per call: sessions accumulate query history, and reusing one
  // across independent validations exhausts the token budget over time.
  private fun newLlmSession(): LlmInferenceSession {
    return LlmInferenceSession.createFromOptions(
      llmInference,
      LlmInferenceSession.LlmInferenceSessionOptions.builder()
        .setTopK(32)
        .setTemperature(0.2f)
        .build()
    )
  }

  override fun definition() = ModuleDefinition {
    Name("LocalMessageValidator")

    AsyncFunction("validateMessage") { message: String ->
      validateMessageInternal(message)
    }

    AsyncFunction("downloadModel") { url: String ->
      downloadModelInternal(url)
    }

    AsyncFunction("isModelReady") {
      isModelReadyInternal()
    }
  }

  private fun validateMessageInternal(message: String): Map<String, Any> {
    val trimmed = message.trim()
    require(trimmed.isNotEmpty()) { "Message cannot be empty." }

    val language = Tasks.await(languageIdentifier.identifyLanguage(trimmed))
    val prompt = buildPrompt(trimmed, language)

    val response = newLlmSession().use { session ->
      session.addQueryChunk(prompt)
      session.generateResponse()
    }
    Log.d("LocalMessageValidator", "Raw model response: $response")
    val parsed = parseResponse(response)

    return mapOf(
      "understandable" to parsed.getBoolean("understandable"),
      "reason" to parsed.getString("reason"),
      "language" to language
    )
  }

  private fun buildPrompt(message: String, language: String): String {
    return """
      You are a strict message clarity checker for a chat app. You must actually
      judge each message individually - do not default to true.
      Respond with ONLY compact JSON, no prose, no markdown fences:
      {"understandable": boolean, "reason": string}

      Mark understandable=false when the message:
      - Is empty, only punctuation/whitespace, or a single meaningless word
      - Is a sentence fragment missing a subject or verb
      - Is random/garbled characters that don't form real words
      - Only makes sense with earlier context that isn't included (e.g. "that one", "fix it", "same as before")

      Mark understandable=true when the message stands on its own, even if short
      (e.g. "Hi", "Thanks!", "Meeting at 3pm").

      Examples:
      Message: "the" -> {"understandable": false, "reason": "Single word with no meaning on its own."}
      Message: "asdkj skjdf" -> {"understandable": false, "reason": "Not real words."}
      Message: "fix that thing from before" -> {"understandable": false, "reason": "Refers to unspecified earlier context."}
      Message: "Can we meet tomorrow at noon?" -> {"understandable": true, "reason": "Clear, complete question."}
      Message: "Thanks!" -> {"understandable": true, "reason": "Short but complete on its own."}

      Now judge this message.
      Detected language: $language
      Message: "$message"
    """.trimIndent()
  }

  private fun parseResponse(response: String): JSONObject {
    val trimmed = response.trim()
    val fencedMatch = Regex("```(?:json)?\\s*([\\s\\S]*?)\\s*```").find(trimmed)
    val json = fencedMatch?.groupValues?.get(1)?.trim()
      ?: run {
        val start = trimmed.indexOf('{')
        val end = trimmed.lastIndexOf('}')
        if (start >= 0 && end > start) {
          trimmed.substring(start, end + 1)
        } else {
          trimmed
        }
      }

    return try {
      JSONObject(json)
    } catch (e: org.json.JSONException) {
      throw IllegalStateException("Model returned invalid/truncated JSON: $json", e)
    }
  }

  private fun resolveModelPath(): String {
    val context = requireNotNull(appContext.reactContext) { "React context is not available." }
    val storageDir = File(context.filesDir, "local-llm")
    if (!storageDir.exists()) {
      storageDir.mkdirs()
    }

    val modelFile = File(storageDir, MODEL_FILE_NAME)
    if (!modelFile.exists()) {
      copyModelFromAssets(context, modelFile)
    }

    if (!modelFile.exists()) {
      throw IllegalStateException(
        "Missing local model. Bundle a quantized .task model at " +
          "android/app/src/main/assets/$MODEL_FILE_NAME (it is copied to " +
          "${modelFile.absolutePath} automatically on first use), or place it there manually."
      )
    }

    return modelFile.absolutePath
  }

  // Copies the model out of APK assets once; silently no-ops if it wasn't bundled.
  private fun copyModelFromAssets(context: Context, destination: File) {
    try {
      context.assets.open(MODEL_FILE_NAME).use { input ->
        FileOutputStream(destination).use { output ->
          input.copyTo(output)
        }
      }
    } catch (e: IOException) {
      destination.delete()
    }
  }

  private fun modelFile(context: Context): File {
    return File(File(context.filesDir, "local-llm"), MODEL_FILE_NAME)
  }

  private fun isModelReadyInternal(): Boolean {
    val context = requireNotNull(appContext.reactContext) { "React context is not available." }
    return modelFile(context).exists()
  }

  // Fetches the .task model over HTTP so the local validation flow can work
  // without bundling the (large) model in the APK or pushing it via adb.
  private fun downloadModelInternal(url: String): Map<String, Any> {
    val context = requireNotNull(appContext.reactContext) { "React context is not available." }
    val storageDir = File(context.filesDir, "local-llm")
    if (!storageDir.exists()) {
      storageDir.mkdirs()
    }

    val destination = modelFile(context)
    val tempFile = File(storageDir, "$MODEL_FILE_NAME.part")

    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 30_000
    connection.readTimeout = 30_000

    try {
      connection.connect()
      val responseCode = connection.responseCode
      if (responseCode !in 200..299) {
        throw IllegalStateException("Failed to download model: HTTP $responseCode from $url")
      }

      connection.inputStream.use { input ->
        FileOutputStream(tempFile).use { output ->
          input.copyTo(output)
        }
      }
    } finally {
      connection.disconnect()
    }

    if (!tempFile.renameTo(destination)) {
      tempFile.copyTo(destination, overwrite = true)
      tempFile.delete()
    }

    return mapOf(
      "path" to destination.absolutePath,
      "bytes" to destination.length()
    )
  }

  companion object {
    private const val MODEL_FILE_NAME = "message-validator.task"
  }
}
