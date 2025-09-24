import type { AppProps } from 'next/app';
import '../../css/base.css';
import '../../css/layout.css';
import '../../css/modal.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
