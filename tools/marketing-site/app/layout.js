import './style.css';
import CampaignLinks from '../components/CampaignLinks';
export const metadata={title:'Андрей Индыков - сопровождение, типология и обучение ИИ',description:'Индивидуальное сопровождение по конкретному запросу, соционика и обучение ИИ для взрослых. Инженерный подход: разобраться, выбрать действие и проверить результат.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}){return <html lang="ru"><body>{children}<CampaignLinks/></body></html>}
