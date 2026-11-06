/**
 * Next.js re-mounts a template on every navigation (unlike a layout), so this
 * gives each public page a short enter transition without any JavaScript.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
