package expo.modules.localmessagevalidator

import com.google.android.gms.tasks.Tasks
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.io.File

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
        .setMaxTokens(256)
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
  }

  private fun validateMessageInternal(message: String): Map<String, Any> {
    val trimmed = message.trim()
    require(trimmed.isNotEmpty()) { "Message cannot be empty." }

    val language = Tasks.await(languageIdentifier.identifyLanguage(trimmed))
    val prompt = buildPrompt(trimmed, language)
    val response = llmInference.generateResponse(prompt)
    val parsed = parseResponse(response)

    return mapOf(
      "understandable" to parsed.getBoolean("understandable"),
      "reason" to parsed.getString("reason"),
      "language" to language
    )
  }

  private fun buildPrompt(message: String, language: String): String {
    return """
      You are a strict message clarity checker.
      Return only valid JSON with this exact shape:
      {"understandable": boolean, "reason": string}

      Rules:
      - Mark understandable only if the message can be understood on its own.
      - If the message is ambiguous, incomplete, or broken, mark it false.
      - Keep the reason short and useful.

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

    return JSONObject(json)
  }

  private fun resolveModelPath(): String {
    val assetsDir = File(appContext.reactContext?.filesDir, "local-llm")
    if (!assetsDir.exists()) {
      assetsDir.mkdirs()
    }

    val modelFile = File(assetsDir, "message-validator.task")
    if (!modelFile.exists()) {
      throw IllegalStateException(
        "Missing local model at ${modelFile.absolutePath}. " +
          "Place a quantized .task model there before running the Android validator."
      )
    }

    return modelFile.absolutePath
  }
}
