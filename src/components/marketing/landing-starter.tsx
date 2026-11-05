import styles from './marketing.module.css';

export function LandingStarter() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.accent} aria-hidden="true" />
      <h1 id="landing-title" className={styles.title}>
        180 Degrees Consulting <span>at UC Davis</span>
      </h1>
    </section>
  );
}
