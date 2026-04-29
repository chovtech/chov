const HeroSection = () => {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center overflow-hidden"
      style={{
        backgroundImage: 'url(/images/hero-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 flex flex-col items-center px-6 pt-10 pb-24 max-w-5xl mx-auto w-full text-center">

        {/* Logo */}
        <div className="mb-8">
          <img
            src="http://viralleadfunnels.com/wp-content/uploads/2022/04/VLF-FE-02-Logo-01.png"
            alt="PagePersona"
            style={{ width: '100%', maxWidth: '220px' }}
            className="mx-auto"
          />
        </div>

        {/* Headline — 2 lines, VLF style */}
        <div
          className="mb-2 text-center"
          style={{ width: 'calc(100vw - 80px)', maxWidth: '1100px' }}
        >
          {/* Line 1 — teal */}
          <h1
            style={{
              fontFamily: 'var(--font-outfit)',
              fontSize: '62px',
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'rgb(21, 234, 175)',
            }}
          >
            Makes Your Sales Page SMART
          </h1>

          {/* Line 2 — brush stroke bg, pulled up tight */}
          <div className="mt-0">
            <span
              style={{
                backgroundImage: 'url(/images/VLF-FE-03-Image-01.png)',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                color: '#ffffff',
                padding: '6px 28px',
                fontFamily: 'var(--font-outfit)',
                fontSize: '56px',
                fontWeight: 900,
                lineHeight: 1.1,
                display: 'inline-block',
              }}
            >
              Read Every Visitor&apos;s Mind
            </span>
          </div>
        </div>

        {/* Subheadline */}
        <p
          className="mb-6 text-center"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 300,
            fontSize: '40px',
            lineHeight: '1.25em',
            color: 'rgb(223, 223, 241)',
            width: 'calc(100vw - 80px)',
            maxWidth: '900px',
          }}
        >
          <strong style={{ fontWeight: 700 }}>PagePersona</strong> detects who is visiting your page, then adapts the page{' '}
          <strong style={{ fontWeight: 700, textDecoration: 'underline' }}>IN REAL TIME</strong>{' '}
          to what they need to see to convert ...{' '}
          <strong style={{ fontWeight: 700 }}>No coding needed.</strong>
        </p>

        {/* Label — solid teal pill, VLF style */}
        <div className="mb-8">
          <span
            className="inline-flex items-center px-7 py-2 rounded-full"
            style={{
              backgroundColor: 'rgb(21, 234, 175)',
              color: 'rgb(52, 51, 91)',
              fontFamily: 'var(--font-outfit)',
              fontWeight: 300,
              fontSize: '26px',
            }}
          >
            Same Technology used by Amazon &amp; Netflix
          </span>
        </div>

        {/* Demo video */}
        <div
          className="w-full mb-10"
          style={{
            maxWidth: '875px',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.55)',
            background: '#000',
            fontSize: 0,
            lineHeight: 0,
            marginTop: '30px',
          }}
        >
          {/* Video iframe — scaled 1% to bleed past edges, overflow:hidden clips clean */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000', lineHeight: 0, overflow: 'hidden' }}>
            <iframe
              src="https://player.vimeo.com/video/459138259"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              style={{ position: 'absolute', top: '-1%', left: '-1%', width: '102%', height: '102%', display: 'block', border: 'none' }}
            />
          </div>

          {/* Caption — teal box with glow */}
          <div
            className="flex items-center gap-3 px-5 py-4"
            style={{
              backgroundColor: 'rgb(21, 234, 175)',
              boxShadow: '0 0 30px rgba(21,234,175,0.25)',
            }}
          >
            <span
              className="font-black text-2xl flex-shrink-0"
              style={{ color: '#0F172A', lineHeight: 1 }}
            >
              »
            </span>
            <p
              style={{ fontFamily: 'var(--font-outfit)', color: 'rgb(52, 51, 91)', fontSize: '20px', lineHeight: '1.4', fontWeight: 300 }}
            >
              While Your Competitors Show Every Visitor The Same Generic Page — Yours Knows Each Visitor And Adapts Automatically.
            </p>
          </div>

        </div>

        {/* Before button */}
        <p
          className="text-center mb-6 max-w-2xl"
          style={{ fontFamily: 'var(--font-outfit)', color: 'rgb(223, 223, 241)', fontSize: '26px', lineHeight: '1.25em', fontWeight: 300 }}
        >
          If you can paste a link, you&apos;re set up in 5 minutes.<br />
          Works on WordPress, Shopify, GoHighLevel, ClickFunnels, Webflow and more.
        </p>

        {/* CTA button */}
        <a
          href="#buy"
          className="inline-block transition-all duration-200 hover:scale-105 mb-4"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 900,
            fontSize: '24px',
            backgroundColor: '#F97316',
            color: '#ffffff',
            borderRadius: '999px',
            padding: '20px 64px',
            boxShadow: '0 8px 40px rgba(249,115,22,0.45)',
            letterSpacing: '0.01em',
          }}
        >
          Get Instant Access — Make My Pages SMART
        </a>

        {/* No download line */}
        <p className="mb-4 text-sm" style={{ color: '#64646a' }}>
          No Download or Installation Required
        </p>

        {/* Trust strip — image with logos + guarantee */}
        <div className="mb-4">
          <img
            src="/images/VLF-FE-05-Image-02.png"
            alt="Secure payment — PayPal, Visa, Mastercard, Amex, Discover · 30 Days Money Back Guarantee"
            className="mx-auto"
            style={{ maxWidth: '480px', width: '100%' }}
          />
        </div>

        {/* Bottom line */}
        <p
          className="text-center mb-6"
          style={{ fontFamily: 'var(--font-outfit)', color: 'rgb(223, 223, 241)', fontSize: '26px', lineHeight: '1.25em', fontWeight: 300 }}
        >
          All Upgrades Included When You Act Today
        </p>

        {/* Bouncing down arrow */}
        <div className="animate-bounce">
          <img
            src="/images/arrow2.webp"
            alt="scroll down"
            style={{ width: '40px', height: 'auto' }}
            className="mx-auto"
          />
        </div>

      </div>
    </section>
  )
}

export default HeroSection
