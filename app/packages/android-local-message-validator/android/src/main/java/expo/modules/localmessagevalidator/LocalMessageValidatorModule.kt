package expo.modules.localmessagevalidator

import android.util.Log
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.genai.common.DownloadStatus
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import com.google.mlkit.nl.languageid.LanguageIdentification
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.runBlocking
import org.json.JSONObject

class LocalMessageValidatorModule : Module() {
  private val languageIdentifier by lazy {
    LanguageIdentification.getClient()
  }

  // Gemini Nano client, served on-device by Android's AICore system service.
  private val generativeModel: GenerativeModel by lazy {
    Generation.getClient()
  }

  override fun definition() = ModuleDefinition {
    Name("LocalMessageValidator")

    AsyncFunction("validateMessage") { message: String ->
      validateMessageInternal(message)
    }

    AsyncFunction("downloadModel") {
      downloadModelInternal()
    }

    AsyncFunction("isModelReady") {
      isModelReadyInternal()
    }
  }

  private fun validateMessageInternal(message: String): Map<String, Any> = runBlocking {
    val trimmed = message.trim()
    require(trimmed.isNotEmpty()) { "Message cannot be empty." }

    val language = Tasks.await(languageIdentifier.identifyLanguage(trimmed))
    val prompt = buildPrompt(trimmed, language)

    val response = generativeModel.generateContent(prompt)
    val text = response.candidates.firstOrNull()?.text
      ?: throw IllegalStateException("Gemini Nano returned an empty response.")
    Log.d("LocalMessageValidator", "Raw model response: $text")
    val parsed = parseResponse(text)

    mapOf(
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

  private fun isModelReadyInternal(): Boolean = runBlocking {
    generativeModel.checkStatus() == FeatureStatus.AVAILABLE
  }

  // Triggers AICore's managed download of Gemini Nano; no-op if already available.
  private fun downloadModelInternal(): Map<String, Any> = runBlocking {
    val status = generativeModel.checkStatus()
    if (status == FeatureStatus.UNAVAILABLE) {
      throw IllegalStateException("Gemini Nano is not supported on this device.")
    }

    var ready = status == FeatureStatus.AVAILABLE
    if (!ready) {
      generativeModel.download().collect { downloadStatus ->
        when (downloadStatus) {
          is DownloadStatus.DownloadCompleted -> ready = true
          is DownloadStatus.DownloadFailed -> throw IllegalStateException(
            "Gemini Nano download failed: ${downloadStatus.e.message}",
            downloadStatus.e
          )
          else -> Unit
        }
      }
    }

    mapOf("ready" to ready)
  }
}
