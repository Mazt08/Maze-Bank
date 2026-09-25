import { useEffect } from 'react';

/**
 * Sets document.title for the current page.
 * Falls back to "Maze Bank" as the site name suffix.
 * @param {string} pageTitle - The page-specific title segment.
 */
export function usePageTitle(pageTitle) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} | Maze Bank` : 'Maze Bank';
    return () => {
      document.title = 'Maze Bank';
    };
  }, [pageTitle]);
}
