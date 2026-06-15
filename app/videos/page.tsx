// app/videos/page.tsx
import VideosGallery from './VideosGallery'

// Page publique : accessible à tous, sans connexion. Les actions d'administration
// (édition / suppression) restent protégées côté serveur dans /api/admin/videos.
export default function VideosPage() {
  return <VideosGallery />
}
