type SiteHeaderProps = {
  minimal?: boolean;
};

export function SiteHeader({ minimal = false }: SiteHeaderProps) {
  return (
    <header className={"site-header" + (minimal ? " site-header--minimal" : "")}>
      <div className="site-header__inner">
        <span className="logo">1Job1Resume</span>
        {!minimal && (
          <span className="tagline">一份 JD，一份简历</span>
        )}
      </div>
    </header>
  );
}
