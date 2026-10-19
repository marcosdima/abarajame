// Persistence helpers over AsyncStorage.

// start:code-snippet{storage-adapters}
import AsyncStorage from '@react-native-async-storage/async-storage';

const saveItem = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.error('Error saving', e);
  }
};

const getItem = async (key: string) => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.error('Error reading', e);
    return null;
  }
};

const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error('Error removing', e);
  }
};

export {
  saveItem,
  getItem,
  removeItem,
};
