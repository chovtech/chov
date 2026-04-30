const ProofStatSection = () => {
  return (
    <section
      className="relative overflow-hidden py-20 px-6"
      style={{
        backgroundImage: 'url(/images/PP-FE-74-Background-24.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="relative z-10 max-w-4xl mx-auto text-center">

        {/* Stat lines */}
        <p
          className="text-[22px] sm:text-[28px] lg:text-[36px] font-black leading-tight mb-1"
          style={{ fontFamily: 'var(--font-outfit)', color: '#131432' }}
        >
          [X] Visitors. [Y] Conversions.
        </p>
        <p
          className="text-[22px] sm:text-[28px] lg:text-[36px] font-black leading-tight mb-8"
          style={{ fontFamily: 'var(--font-outfit)', color: '#00AE7E' }}
        >
          [Z]% Increase In Conversion Rate.
        </p>

        {/* Pill question */}
        <div className="flex justify-center mb-4">
          <span
            className="inline-block px-8 py-3 rounded-full text-[20px] sm:text-[26px] lg:text-[34px] font-black"
            style={{
              fontFamily: 'var(--font-outfit)',
              backgroundColor: 'rgba(138, 122, 255, 0.13)',
              color: '#131432',
            }}
          >
            Extra Ad Spend Required?
          </span>
        </div>

        {/* Zero. Zilch. Nada. — emotional release line */}
        <h2
          className="text-[52px] sm:text-[64px] lg:text-[76px] font-black leading-none mb-10"
          style={{ fontFamily: 'var(--font-outfit)', color: '#131432' }}
        >
          Zero. Zilch. Nada.
        </h2>

        {/* Sub-copy */}
        <p
          className="text-[18px] sm:text-[21px] font-bold underline mb-3"
          style={{ fontFamily: 'var(--font-outfit)', color: '#131432' }}
        >
          Take A Look For Yourself:
        </p>
        <p
          className="text-[16px] sm:text-[19px] max-w-2xl mx-auto mb-14"
          style={{ fontFamily: 'var(--font-outfit)', color: '#131432', fontWeight: 400, lineHeight: '1.5' }}
        >
          The same page. The same traffic. The only thing that changed was PagePersona
          detecting who was visiting and showing them the right message at the right moment.
        </p>

        {/* Image block — brush bg + proof screenshot + arrows */}
        <div className="relative inline-block w-full max-w-4xl">

          {/* Left dashed arrow */}
          <img
            src="/images/PP-FE-10-Image-06.png"
            alt=""
            className="absolute hidden sm:block"
            style={{ width: '120px', left: '-60px', top: '40px', zIndex: 2 }}
          />

          {/* Right dashed arrow */}
          <img
            src="/images/PP-FE-11-Image-07.png"
            alt=""
            className="absolute hidden sm:block"
            style={{ width: '120px', right: '-60px', top: '40px', zIndex: 2 }}
          />

          {/* Purple brush stroke background */}
          <div className="relative">
            <img
              src="/images/PP-FE-66-Image-40.png"
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ zIndex: 1 }}
            />

            {/* Proof screenshot on top of brush */}
            <img
              src="/images/PP_NewProof01-1024x463.png"
              alt="PagePersona real results proof"
              className="relative w-full"
              style={{ zIndex: 2, borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}
            />
          </div>

        </div>

      </div>
    </section>
  )
}

export default ProofStatSection
