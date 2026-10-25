import { permanentRedirect } from 'next/navigation';

/**
 * The pricing page only repeated each station's price, which the station list
 * already shows. Old links and bookmarks land on the list instead.
 */
export default function PricingPage(): never {
  permanentRedirect('/stations');
}
