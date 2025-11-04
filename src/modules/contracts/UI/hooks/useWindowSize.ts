import { useState, useEffect } from 'react';

// Define la interfaz para el tamaño de la ventana
interface Size {
  width: number | undefined;
  height: number | undefined;
}

export function useWindowSize(): Size {
  const [windowSize, setWindowSize] = useState<Size>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // Función que se llama en el evento resize
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Añadir el listener
    window.addEventListener('resize', handleResize);

    // Llamar una vez al inicio para establecer el tamaño inicial
    handleResize();

    // Remover el listener al desmontar el componente
    return () => window.removeEventListener('resize', handleResize);
  }, []); // El array vacío asegura que solo se ejecute al montar/desmontar

  return windowSize;
}