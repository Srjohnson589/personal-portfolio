export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-zinc-500">
      <p>
        Built with Next.js, Tailwind CSS, and Framer Motion. &copy;{" "}
        {new Date().getFullYear()} your name.
      </p>
    </footer>
  );
}
