import type { ReactPaint } from '@canvas/index'
import useAnnouncements from '@editor/hooks/useAnnouncements'
import useEditorLocale from '@editor/hooks/useEditorLocale'

/**
 * Live region of the changes made by the user, read by the assistive technologies. It holds its own state: an
 * announcement renders it alone, not the editor
 */
const Announcements = ({ paint }: { paint: ReactPaint }) => {
  const locale = useEditorLocale()
  const announcement = useAnnouncements(paint, locale)
  return (
    <div className='react-paint-editor-sr-only' role='status' lang={locale.lang}>
      {announcement}
    </div>
  )
}

export default Announcements
