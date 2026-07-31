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

module.exports = {
  getNativeLocalMessageValidator,
  validateMessage,
};
