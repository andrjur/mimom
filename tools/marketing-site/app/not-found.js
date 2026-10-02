import {SiteHeader,SiteFooter} from '../components/SiteShell';
export default function NotFound(){return <main><SiteHeader/><section className="routeHero"><p className="overline">404</p><h1>Этой страницы нет.</h1><p className="routeLead">Выберите направление или вернитесь на главную.</p><a className="btn primary" href="/start/">Все направления</a></section><SiteFooter/></main>}
