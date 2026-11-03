import type { Variants } from 'motion/react';

/**
 * A month's cards coming in: the page fades in and its cards rise into place
 * one after another — short, so stepping through months never waits on it.
 * Put `stagger` on the container (with initial="hidden" animate="show") and
 * `rise` on each card; a card added later rises in on its own.
 */
export const stagger: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18, staggerChildren: 0.035 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] } },
};
