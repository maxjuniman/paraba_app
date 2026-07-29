import { useCallback, useState } from 'react';

export function useErrorAlert() {
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Atenção');

  const showError = useCallback((message: string, title = 'Atenção') => {
    setErrorMessage(message);
    setErrorTitle(title);
    setErrorVisible(true);
  }, []);

  const hideError = useCallback(() => {
    setErrorVisible(false);
  }, []);

  return {
    errorVisible,
    errorMessage,
    errorTitle,
    showError,
    hideError,
  };
}
