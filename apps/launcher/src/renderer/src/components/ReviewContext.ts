import { createContext, useContext } from 'react';
import type { CustomModItem } from '../views/ModsView';

export const ReviewContext = createContext<(mod: CustomModItem, reason: string, projectUrl: string) => void>(() => { throw new Error('Отправка пока недоступна'); });
export const useSubmitReview = () => useContext(ReviewContext);
