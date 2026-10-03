import { Helmet } from "react-helmet";
import styles from "./study.module.css";

export default function StudyPage() {
  return <>
    <Helmet>
      <title>Resonance validation study — closed</title>
      <meta name="robots" content="noindex,nofollow"/>
      <meta name="description" content="The Resonance external validation study is closed and is not collecting responses."/>
    </Helmet>
    <main className={styles.page}>
      <header><a href="/">Resonance</a><span>Validation study closed</span></header>
      <section className={styles.hero}>
        <span>Phase 5 skipped</span>
        <h1>This study is closed.</h1>
        <p>Resonance is no longer collecting outside-user validation responses for this hackathon submission. No further participant data is being requested or used.</p>
      </section>
      <section className={styles.card}>
        <span className={styles.step}>Transparency</span>
        <h2>No study results are being claimed.</h2>
        <p>The study closed with zero valid target-user responses. The submission does not claim participant-derived time savings, ratings, testimonials, or quotes.</p>
        <p>If you received an earlier invitation, no action is needed and there will be no unsolicited follow-up.</p>
        <p><a href="/">Return to the live Resonance demo</a></p>
      </section>
      <footer>Closed October 3, 2026 · no participant response collection</footer>
    </main>
  </>;
}
   29