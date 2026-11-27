import type { ReactNode } from 'react';
import styles from './home.module.css';

const BIBLIOTECA_LOCAL = 'http://localhost:8000';
const CADASTRO_AARDVARK = 'https://app.aardvarkbookclub.com/books';

function LinkPill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.refPill} href={href}>
      <span className={styles.refButtonBg} />
      <span className={styles.refButtonInner}>
        <span className={styles.refButtonText}>{children}</span>
      </span>
    </a>
  );
}

function BotaoPrincipal({ children, href }: { children: string; href: string }) {
  return (
    <a className={styles.refAltButton} href={href}>
      <span className={styles.refAltTextWrap}>
        <span className={styles.refAltBg} />
        <span className={styles.refAltTextOuter}>
          <span className={styles.refAltText}>{children}</span>
        </span>
      </span>
      <span className={styles.refAltIconWrap}>
        <span className={styles.refAltBg} />
        <span className={styles.refAltIconOuter}>
          <svg viewBox="0 0 14 13" aria-hidden="true">
            <path d="M13.58 5.66v.845l-5.994 5.66-1.71-2.063a61.427 61.427 0 0 1 4.265-2.988l-.02-.078c-1.828.196-4.107.294-6.387.294H0V4.835h3.734c2.28 0 4.56.098 6.387.294l.02-.059a67.638 67.638 0 0 1-4.265-3.006L7.586 0l5.994 5.66Z" fill="currentColor" />
          </svg>
        </span>
      </span>
    </a>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a className={styles.refSocialLink} href={href} target="_blank" rel="noreferrer" aria-label={label}>
      <span className={styles.refSocialInner}>
        <span className={styles.refSocialBg} />
        <span className={styles.refSocialIcon}>{children}</span>
      </span>
    </a>
  );
}

export function CabecalhoAbertura() {
  return (
    <header className={styles.refHeader}>
      <div className={styles.refHeaderInner}>
        <div className={styles.refHeaderBrand}>
          <a href={BIBLIOTECA_LOCAL} aria-label="Aardvark Book Club Logo">
            <img
              className={styles.refHeaderLogo}
              src="https://cdn.prod.website-files.com/696173cb00865d1b386e4af8/696179694070e2fa9eca375f_logo.svg"
              width="234"
              height="59"
              alt="Aardvark Book Club Logo"
            />
          </a>
        </div>
        <nav className={styles.refHeaderNav} aria-label="Principal">
          <ul className={styles.refHeaderNavList}>
            <li><LinkPill href={`${BIBLIOTECA_LOCAL}/allbooks`}>All Books</LinkPill></li>
            <li><LinkPill href={`${BIBLIOTECA_LOCAL}/gifting`}>Gifting</LinkPill></li>
            <li><LinkPill href={`${BIBLIOTECA_LOCAL}/merch`}>Merch</LinkPill></li>
            <li><LinkPill href={`${BIBLIOTECA_LOCAL}/faq`}>FAQ</LinkPill></li>
            <li><BotaoPrincipal href={CADASTRO_AARDVARK}>Log-in / Sign-up</BotaoPrincipal></li>
          </ul>
        </nav>
        <div className={styles.refHeaderSub}>
          <ul className={styles.refHeaderSubList}>
            <li>
              <LinkPill href={`${BIBLIOTECA_LOCAL}/`}>
                <span aria-hidden="true">🇬🇧 </span>Shopping from the UK?
              </LinkPill>
            </li>
            <li>
              <SocialLink href="https://www.instagram.com/aardvarkbookclub/" label="Go to Instagram">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6Zm9.65 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="currentColor" />
                </svg>
              </SocialLink>
            </li>
            <li>
              <SocialLink href="https://www.tiktok.com/@aardvarkbookclub" label="Go to TikTok">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" fill="currentColor" />
                </svg>
              </SocialLink>
            </li>
          </ul>
        </div>
        <button className={styles.refHeaderMenu} type="button" aria-label="Menu">
          Menu
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </div>
    </header>
  );
}
