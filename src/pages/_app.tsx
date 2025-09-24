import type { AppProps } from 'next/app';
import '../styles/base.css';
import '../styles/layout.css';
import '../styles/modal.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
