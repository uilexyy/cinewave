export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span style={{ fontSize: size, fontWeight: 800, letterSpacing: "-0.5px" }} className="logo">
      CineWave
    </span>
  );
}
