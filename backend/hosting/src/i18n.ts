import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      language: "Language",
      languageEnglish: "English",
      languageSpanish: "Spanish",
      fetchCommand: "fetch latest.json --fresh",
      storage: "Firebase Storage",
      latestPosts: "Latest posts",
      running: "running...",
      refresh: "refresh",
      updatedAt: "updated_at",
      items: "items",
      loadingNext: "loading next post...",
      noMore: "no more posts to go!",
      oops: "Oops...",
      requestTime: "request_time",
      untitledPost: "Untitled post",
      emptyPost: "(empty post)",
      postAlt: "Post {{index}}",
      errors: {
        latest: "Unable to download latest.json.",
      },
    },
  },
  es: {
    translation: {
      language: "Idioma",
      languageEnglish: "Ingles",
      languageSpanish: "Espanol",
      fetchCommand: "descargar latest.json --fresh",
      storage: "Firebase Storage",
      latestPosts: "Ultimas publicaciones",
      running: "ejecutando...",
      refresh: "actualizar",
      updatedAt: "actualizado_en",
      items: "elementos",
      loadingNext: "cargando la siguiente publicacion...",
      noMore: "no hay mas publicaciones!",
      oops: "Ups...",
      requestTime: "hora_de_solicitud",
      untitledPost: "Publicacion sin titulo",
      emptyPost: "(publicacion vacia)",
      postAlt: "Publicacion {{index}}",
      errors: {
        latest: "No se pudo descargar latest.json.",
      },
    },
  },
};

const savedLanguage = window.localStorage.getItem("pocket-helper-language");
const browserLanguage = window.navigator.language.toLowerCase().startsWith("es")
  ? "es"
  : "en";

void i18n.use(initReactI18next).init({
  resources,
  lng: savedLanguage === "es" || savedLanguage === "en" ? savedLanguage : browserLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;