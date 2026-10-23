import { Link } from '../lib/router';
import { MAINTENANCE_PLANS } from '../lib/business';

/** The three recurring maintenance plans, with Monthly marked as recommended. */
export function MaintenancePlans() {
  return (
    <div className="price-grid n3 plans">
      {MAINTENANCE_PLANS.map((p) => (
        <article className={'price-card plan' + (p.recommended ? ' recommended' : '')} key={p.name}>
          {p.recommended && <span className="plan-badge">★ RECOMMENDED</span>}
          <h4>{p.name}</h4>
          <span className="plan-cadence">{p.cadence}</span>
          <div className="price">
            <strong>{p.price}</strong>
          </div>
          <ul>
            {p.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <Link href={'/book?service=' + encodeURIComponent(p.option)}>START THIS PLAN →</Link>
        </article>
      ))}
    </div>
  );
}
