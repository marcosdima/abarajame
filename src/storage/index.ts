import { createStorage } from 'alambre';
import { getItem, removeItem, saveItem } from '../utils/storage';

export const storage = createStorage({
  getItem,
  setItem: saveItem,
  removeItem,
});
