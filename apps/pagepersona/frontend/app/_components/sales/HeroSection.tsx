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
          className="mb-6 text-center"
          style={{ width: 'calc(100vw - 80px)', maxWidth: '1100px' }}
        >
          {/* Line 1 — teal */}
          <h1
            style={{
              fontFamily: 'var(--font-outfit)',
              fontSize: '64px',
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'rgb(21, 234, 175)',
            }}
          >
            Makes Your Sales Page SMART
          </h1>

          {/* Line 2 — brush stroke bg */}
          <div className="mt-2">
            <span
              style={{
                backgroundImage: 'url(/images/VLF-FE-03-Image-01.png)',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                color: '#ffffff',
                padding: '6px 28px',
                fontFamily: 'var(--font-outfit)',
                fontSize: '64px',
                fontWeight: 900,
                lineHeight: 1.2,
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
          Our <strong style={{ fontWeight: 700 }}>Advanced AI</strong> detects who is visiting your page, then adapts the page to what they need to see —{' '}
          <strong style={{ fontWeight: 700, textDecoration: 'underline' }}>IN REAL TIME</strong>. One page. Every visitor feels like it was built just for them.
        </p>

        {/* Label — moved here after subheadline, pill badge */}
        <div className="mb-8">
          <span
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm md:text-base tracking-wide"
            style={{
              background: 'linear-gradient(to right, rgb(6, 148, 110), rgb(21, 234, 175))',
              color: '#0F172A',
            }}
          >
            <span>•</span>
            <span>The Same Personalisation Technology Amazon &amp; Netflix Use — Now On Your Sales Page</span>
            <span>•</span>
          </span>
        </div>

        {/* Demo video */}
        <div className="w-full max-w-2xl mb-4 rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <iframe
            src="https://player.vimeo.com/video/459138259"
            width="100%"
            height="100%"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            style={{ display: 'block' }}
          />
        </div>

        {/* Video caption */}
        <p className="text-gray-400 text-sm italic mb-10 max-w-2xl">
          While Your Competitors Show Every Visitor The Same Generic Page — Yours Knows Each Visitor And Adapts Automatically.
        </p>

        {/* Before button */}
        <p className="text-gray-200 text-base mb-1">
          If you can paste a link, you&apos;re set up in 5 minutes.
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Works on WordPress · Shopify · GoHighLevel · ClickFunnels · Webflow and more
        </p>

        {/* CTA button */}
        <a
          href="#buy"
          className="inline-block font-black text-xl px-14 py-5 rounded-full transition-all duration-200 hover:scale-105 mb-6"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 900,
            backgroundColor: '#F97316',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(249,115,22,0.4)',
          }}
        >
          Get Instant Access — Make My Pages SMART
        </a>

        {/* Trust strip — line 1 */}
        <p className="text-gray-400 text-xs mb-3">
          No Download or Installation Required
        </p>

        {/* Trust strip — platforms + guarantee */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-4">
          <span className="text-gray-300 text-xs">WordPress · Shopify · GoHighLevel · ClickFunnels · Webflow &amp; More</span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1 text-xs" style={{ color: 'rgb(21, 234, 175)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>verified</span>
            30 Days Money Back Guarantee
          </span>
        </div>

        {/* Trust strip — payment logos (text placeholder) */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="text-gray-500 text-xs">PayPal · Visa · Mastercard · Amex · Discover</span>
        </div>

        {/* Bottom line */}
        <p className="font-semibold text-sm" style={{ color: 'rgb(21, 234, 175)' }}>
          All Upgrades Included When You Act Today — No Monthly Fees Trap.
        </p>

      </div>
    </section>
  )
}

export default HeroSection
