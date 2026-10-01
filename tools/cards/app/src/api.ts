export function apiUrl(path:string){return ((import.meta as any).env.VITE_CARDS_API_BASE||'/api').replace(/\/$/,'')+path.replace(/^\/api/,'');}
