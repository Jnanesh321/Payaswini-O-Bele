"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, MicOff, X, Volume2, Sparkles, CheckCircle2 } from "lucide-react"

interface VoiceSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectQuery: (query: string) => void
  locale: string
}

const POPULAR_VOICE_PROMPTS = [
  { en: "Power Tiller", kn: "ಪವರ್ ಟಿಲ್ಲರ್", icon: "🚜" },
  { en: "Arecanut Pole", kn: "ಅಡಿಕೆ ಮರ ಕೊಯ್ಲು ಯಂತ್ರ", icon: "🌴" },
  { en: "Brush Cutter", kn: "ಕಳೆ ಕತ್ತರಿಸುವ ಯಂತ್ರ", icon: "🌿" },
  { en: "Sprayer", kn: "ಔಷಧ ಸಿಂಪಡಿಸುವ ಸ್ಪ್ರೇಯರ್", icon: "💧" },
  { en: "Tractor", kn: "ಟ್ರ್ಯಾಕ್ಟರ್", icon: "🚜" },
  { en: "Water Pump", kn: "ವಾಟರ್ ಪಂಪ್", icon: "⚡" },
]

export function VoiceSearchModal({
  isOpen,
  onClose,
  onSelectQuery,
  locale,
}: VoiceSearchModalProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [lang, setLang] = useState<"kn-IN" | "en-IN">(locale === "kn" ? "kn-IN" : "en-IN")
  const [errorNotice, setErrorNotice] = useState<string | null>(null)
  const recognitionRef = useRef<unknown>(null)

  // Initialize SpeechRecognition if supported
  useEffect(() => {
    if (!isOpen) {
      stopListening()
      setTranscript("")
      setErrorNotice(null)
      return
    }

    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      setErrorNotice(
        locale === "kn"
          ? "ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಬೆಂಬಲಿಸುವುದಿಲ್ಲ. ಕೆಳಗಿನ ಪದಗಳನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ."
          : "Voice recognition is not supported on this browser. Tap any suggestion below."
      )
      return
    }

    try {
      // @ts-expect-error SpeechRecognition constructor
      const recognition = new SpeechRecognitionAPI()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = lang

      recognition.onstart = () => {
        setIsListening(true)
        setErrorNotice(null)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const current = event.resultIndex
        const text = event.results[current][0].transcript
        setTranscript(text)
        if (event.results[current].isFinal) {
          setTimeout(() => {
            onSelectQuery(text)
            onClose()
          }, 800)
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error !== "no-speech") {
          setErrorNotice(
            locale === "kn"
              ? "ಧ್ವನಿ ಕೇಳಿಬರಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ."
              : "Could not detect voice. Please speak again or pick a quick prompt."
          )
        }
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setErrorNotice(
        locale === "kn"
          ? "ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಅಗತ್ಯವಿದೆ."
          : "Microphone access required. Please grant permission."
      )
      setIsListening(false)
    }

    return () => {
      stopListening()
    }
  }, [isOpen, lang, locale, onClose, onSelectQuery])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        // @ts-expect-error stop method
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsListening(false)
  }, [])

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else if (recognitionRef.current) {
      try {
        setTranscript("")
        setErrorNotice(null)
        // @ts-expect-error start method
        recognitionRef.current.start()
      } catch {
        // ignore
      }
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-0 sm:items-center sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="relative z-10 flex w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl border border-neutral-200 bg-card p-6 shadow-2xl pb-safe"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles size={15} />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  {locale === "kn" ? "ಧ್ವನಿ ಹುಡುಕಾಟ" : "Vernacular Voice Search"}
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  {locale === "kn" ? "ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ" : "Speak in Kannada or English"}
                </p>
              </div>
            </div>

            {/* Language Switch for Speech */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLang(lang === "kn-IN" ? "en-IN" : "kn-IN")}
                className="rounded-lg border border-border px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-muted"
              >
                {lang === "kn-IN" ? "🇮🇳 ಕನ್ನಡ" : "🌐 English"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Center Mic Visualizer */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative flex items-center justify-center">
              {/* Pulsing rings when listening */}
              {isListening && (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    className="absolute h-24 w-24 rounded-full bg-primary/20"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.6, delay: 0.3, ease: "easeInOut" }}
                    className="absolute h-28 w-28 rounded-full bg-primary/15"
                  />
                </>
              )}

              <button
                type="button"
                onClick={toggleListening}
                className={`relative z-10 flex h-18 w-18 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 ${
                  isListening
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {isListening ? (
                  <Mic size={30} className="animate-pulse" />
                ) : (
                  <MicOff size={30} />
                )}
              </button>
            </div>

            {/* Listening Status & Transcript */}
            <div className="mt-4 text-center px-4">
              {isListening ? (
                <p className="text-xs font-semibold text-primary animate-pulse flex items-center justify-center gap-1.5">
                  <Volume2 size={14} />
                  <span>{locale === "kn" ? "ಆಲಿಸುತ್ತಿದ್ದೇವೆ... ಮಾತನಾಡಿ" : "Listening... speak now"}</span>
                </p>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">
                  {locale === "kn" ? "ಮೈಕ್ ಮೇಲೆ ಟ್ಯಾಪ್ ಮಾಡಿ ಮಾತನಾಡಿ" : "Tap microphone to speak"}
                </p>
              )}

              {transcript ? (
                <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    {locale === "kn" ? "ಗುರುತಿಸಿದ ಧ್ವನಿ:" : "Recognized:"}
                  </p>
                  <p className="font-display text-sm font-bold text-foreground mt-0.5">
                    &ldquo;{transcript}&rdquo;
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectQuery(transcript)
                      onClose()
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                  >
                    <CheckCircle2 size={13} />
                    <span>{locale === "kn" ? "ಈಗಲೇ ಹುಡುಕಿ" : "Search with this"}</span>
                  </button>
                </div>
              ) : null}

              {errorNotice && (
                <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                  {errorNotice}
                </p>
              )}
            </div>
          </div>

          {/* Quick Prompts Rail */}
          <div className="border-t border-border/70 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              {locale === "kn" ? "ಜನಪ್ರಿಯ ಯಂತ್ರೋಪಕರಣಗಳು" : "Popular Farm Machinery"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_VOICE_PROMPTS.map((prompt) => {
                const label = locale === "kn" ? prompt.kn : prompt.en
                return (
                  <button
                    key={prompt.en}
                    type="button"
                    onClick={() => {
                      onSelectQuery(label)
                      onClose()
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 transition active:scale-95"
                  >
                    <span>{prompt.icon}</span>
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
