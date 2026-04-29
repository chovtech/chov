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

        {/* Small label */}
        <p className="text-white text-sm md:text-base mb-5 font-semibold tracking-wide">
          The Same Personalisation Technology Amazon &amp; Netflix Use — Now On Your Sales Page
        </p>

        {/* Main headline */}
        <h1
          className="leading-[1.25] mb-6 max-w-4xl"
          style={{ fontFamily: 'var(--font-outfit)', fontSize: '54px', fontWeight: 400 }}
        >
          <span style={{ color: 'rgb(21, 234, 175)' }}>Finally: </span>
          <span style={{ color: '#ffffff', fontWeight: 900 }}>The AI System That Makes Your Sales Page </span>
          <span
            className="px-2 py-0.5 rounded"
            style={{ color: '#0F172A', backgroundColor: 'rgb(21, 234, 175)', fontWeight: 900 }}
          >
            SMART
          </span>
          <span style={{ color: '#ffffff', fontWeight: 900 }}> Enough To Read Every Visitor&apos;s Mind — And Convert </span>
          <span style={{ color: 'rgb(21, 234, 175)', fontWeight: 900 }}>MORE</span>
          <span style={{ color: '#ffffff', fontWeight: 900 }}> Of Them</span>
        </h1>

        {/* Subheadline */}
        <p className="text-gray-200 text-lg md:text-xl mb-10 max-w-3xl leading-relaxed">
          PagePersona detects who is visiting your page — then automatically changes it in real time to match what that visitor actually wants to see. One page. Every visitor feels like it was built just for them.
          <br /><br />
          <span className="text-white font-semibold">No code. No developer. No guesswork.</span>
        </p>

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
