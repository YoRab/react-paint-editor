import type { ReactPaint } from '@canvas/index'
import useAnnouncements from '@editor/hooks/useAnnouncements'

/**
 * Live region of the changes made by the user, read by the assistive technologies. It holds its own state: an
 * announcement renders it alone, not the editor
 */
const Announcements = ({ paint }: { paint: ReactPaint }) => {
  const announcement = useAnnouncements(paint)
  return (
    <div className='react-paint-editor-sr-only' role='status'>
      {announcement}
    </div>
  )
}

export default Announcements
