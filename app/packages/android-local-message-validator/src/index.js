const { requireNativeModule } = require('expo-modules-core');

function getNativeLocalMessageValidator() {
  try {
    return requireNativeModule('LocalMessageValidator');
  } catch (error) {
    return null;
  }
}

async function validateMessage(message) {
  const nativeModule = getNativeLocalMessageValidator();
  if (!nativeModule) {
    throw new Error('LocalMessageValidator native module is unavailable.');
  }

  return nativeModule.validateMessage(message);
}

async function downloadModel() {
  const nativeModule = getNativeLocalMessageValidator();
  if (!nativeModule) {
    throw new Error('LocalMessageValidator native module is unavailable.');
  }

  return nativeModule.downloadModel();
}

async function isModelReady() {
  const nativeModule = getNativeLocalMessageValidator();
  if (!nativeModule) {
    return false;
  }

  return nativeModule.isModelReady();
}

module.exports = {
  getNativeLocalMessageValidator,
  validateMessage,
  downloadModel,
  isModelReady,
};
