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
            className="h-10 w-auto mx-auto"
          />
        </div>

        {/* Attention label */}
        <p className="text-gray-300 text-sm md:text-base mb-5 italic">
          Attention: A Must Have For Marketers, Coaches, Agency Owners &amp; Anyone With A Landing Page…
        </p>

        {/* Main headline */}
        <h1
          className="leading-[1.25] mb-5 max-w-4xl"
          style={{ fontFamily: 'var(--font-outfit)', fontSize: '54px', fontWeight: 400 }}
        >
          <span style={{ color: 'rgb(21, 234, 175)' }}>Finally: </span>
          <span style={{ color: '#ffffff', fontWeight: 900 }}>The AI System That Makes Any Sales Page, Landing Page Or Website </span>
          <span
            className="px-2 py-0.5 rounded"
            style={{ color: '#0F172A', backgroundColor: 'rgb(21, 234, 175)', fontWeight: 900 }}
          >
            SMART
          </span>
          <span style={{ color: '#ffffff', fontWeight: 900 }}> Enough To Automatically Change Itself For Every Single Visitor — </span>
          <span style={{ color: 'rgb(21, 234, 175)' }}>So You Convert More Of The Traffic You&apos;re Already Getting</span>
        </h1>

        {/* One-liner — Amazon/Netflix credibility + salesperson angle */}
        <p className="text-white font-semibold text-lg md:text-xl mb-6 max-w-3xl leading-snug">
          It&apos;s The Same Personalisation Technology Amazon, Netflix And Booking.com Use To Convert Every Visitor — Like Having A Personal Salesperson For Every Single Person On Your Page.
        </p>

        {/* Subheadline */}
        <p className="text-gray-300 text-base md:text-lg mb-10 max-w-3xl leading-relaxed">
          Email marketers have been personalising for years — different messages, different offers, different urgency for different subscribers. But every visitor to your website still sees the exact same page. That&apos;s the gap PagePersona closes. It detects who&apos;s visiting — their traffic source, location, device, behaviour and time of day — and instantly swaps your headlines, images, offers and popups to match.{' '}
          <span className="text-white font-medium">One page. Every visitor gets the version most likely to convert them.</span>{' '}
          Works on WordPress, Shopify, GoHighLevel, ClickFunnels, Webflow and more.
        </p>

        {/* Demo video */}
        <div className="w-full max-w-2xl mb-10 rounded-2xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
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

        {/* Pre-CTA line */}
        <p className="text-gray-300 text-sm mb-3">
          <strong className="text-white">All Upgrades Included When You Act NOW…</strong>
        </p>

        {/* Pricing line */}
        <p className="text-gray-400 text-base mb-4">
          Get PagePersona For Just{' '}
          <span className="line-through text-gray-500">$197</span>{' '}
          <strong className="text-white text-xl">$37</strong>
        </p>

        {/* CTA button */}
        <a
          href="#buy"
          className="inline-block font-black text-xl px-14 py-5 rounded-full transition-all duration-200 hover:scale-105 mb-5 shadow-lg"
          style={{
            fontFamily: 'var(--font-syne)',
            backgroundColor: '#F97316',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(249,115,22,0.4)',
          }}
        >
          Get Instant Access Now
        </a>

        {/* Payment logos row */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <span className="text-gray-500 text-xs">Secure checkout via</span>
          <span className="text-gray-300 text-xs font-medium">PayPal · Visa · Mastercard · Amex</span>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-gray-400 text-xs">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs" style={{ color: '#14B8A6', fontSize: 14 }}>
              verified
            </span>
            30 Day Money Back Guarantee
          </span>
          <span className="text-gray-600">·</span>
          <span>No Monthly Fees</span>
          <span className="text-gray-600">·</span>
          <span>Works On Any Platform</span>
          <span className="text-gray-600">·</span>
          <span>No Coding Required</span>
        </div>

        {/* Fine print */}
        <p className="text-gray-600 text-xs mt-4">
          One-time payment · No upsells required to use the core product · No hidden fees
        </p>
      </div>
    </section>
  )
}

export default HeroSection
