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
        <div className="mb-2 text-center w-full px-4 max-w-[1100px]">
          {/* Line 1 — teal */}
          <h1
            className="text-[38px] sm:text-[50px] lg:text-[62px]"
            style={{
              fontFamily: 'var(--font-outfit)',
              fontWeight: 900,
              lineHeight: 1.1,
              color: 'rgb(21, 234, 175)',
            }}
          >
            Makes Your Sales Page SMART
          </h1>

          {/* Line 2 — brush stroke bg */}
          <div className="mt-0">
            <span
              className="text-[32px] sm:text-[44px] lg:text-[56px]"
              style={{
                backgroundImage: 'url(/images/VLF-FE-03-Image-01.png)',
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                color: '#ffffff',
                padding: '6px 28px',
                fontFamily: 'var(--font-outfit)',
                fontWeight: 900,
                lineHeight: 1.1,
                display: 'inline-block',
              }}
            >
              Read Every Visitor&apos;s MIND
            </span>
          </div>
        </div>

        {/* Subheadline */}
        <p
          className="mb-6 text-center px-4 w-full max-w-[900px] text-[20px] sm:text-[28px] lg:text-[40px]"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 300,
            lineHeight: '1.25em',
            color: 'rgb(223, 223, 241)',
          }}
        >
          PagePersona <strong style={{ fontWeight: 700 }}>detects</strong> who is visiting your page, then{' '}
          <strong style={{ fontWeight: 700 }}>adapts</strong> the page{' '}
          <strong style={{ fontWeight: 700 }}>in real time</strong> to what they need to see to convert ...{' '}
          <strong style={{ fontWeight: 700 }}>Zero</strong> coding.{' '}
          <strong style={{ fontWeight: 700 }}>Zero</strong> developer.{' '}
          <strong style={{ fontWeight: 700 }}>Zero</strong> guesswork.
        </p>

        {/* Label — solid teal pill, VLF style */}
        <div className="mb-8">
          <span
            className="inline-flex items-center justify-center px-5 py-2 rounded-full text-[14px] sm:text-[18px] lg:text-[26px] text-center max-w-xs sm:max-w-none"
            style={{
              backgroundColor: 'rgb(21, 234, 175)',
              color: 'rgb(52, 51, 91)',
              fontFamily: 'var(--font-outfit)',
              fontWeight: 300,
            }}
          >
            Same Personalisation Technology Used By <strong style={{ fontWeight: 600 }}>Amazon &amp; Netflix</strong>
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
          {/* Video iframe — Wistia with videoFoam fills container seamlessly */}
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, background: '#000', lineHeight: 0 }}>
            <iframe
              src="https://fast.wistia.net/embed/iframe/0ssmmjex3v?chromeless=false&controlsVisibleOnLoad=true&playbar=true&fullscreenButton=true&playerColor=034327&videoFoam=true"
              frameBorder="0"
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', border: 'none' }}
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
              While Your Competitors Show Every Visitor <span style={{ textDecoration: 'underline' }}>The Same Generic Page</span> — <strong style={{ fontWeight: 700 }}>Yours Knows Each Visitor And Adapts Automatically.</strong>
            </p>
          </div>

        </div>

        {/* Before button */}
        <p
          className="text-center mb-6 max-w-2xl px-4 text-[17px] sm:text-[20px] lg:text-[26px]"
          style={{ fontFamily: 'var(--font-outfit)', color: 'rgb(223, 223, 241)', lineHeight: '1.25em', fontWeight: 300 }}
        >
          <strong style={{ fontWeight: 700, textDecoration: 'underline' }}>If You Can Paste A Link,</strong> you&apos;re set up in <strong style={{ fontWeight: 700 }}>5 minutes</strong>.<br />
          Works on WordPress, Shopify, GoHighLevel, ClickFunnels, Webflow and more.
        </p>

        {/* CTA button */}
        <a
          href="#buy"
          className="inline-block transition-all duration-200 hover:scale-105 mb-4 text-[16px] sm:text-[20px] lg:text-[24px] px-8 sm:px-14 py-4 sm:py-5"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 900,
            backgroundColor: '#F97316',
            color: '#ffffff',
            borderRadius: '999px',
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
          className="text-center mb-6 px-4 text-[17px] sm:text-[20px] lg:text-[26px]"
          style={{ fontFamily: 'var(--font-outfit)', color: 'rgb(223, 223, 241)', lineHeight: '1.25em', fontWeight: 300 }}
        >
          <span style={{ textDecoration: 'underline' }}>All Upgrades Included</span> When You Act Today
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
