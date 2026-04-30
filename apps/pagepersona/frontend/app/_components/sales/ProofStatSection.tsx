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

        {/* Line 1 — purple, 30px */}
        <p
          className="mb-1"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 400,
            fontSize: '30px',
            lineHeight: '1.25em',
            color: 'rgb(66, 61, 207)',
          }}
        >
          3,847 Visitors. 2,219 Conversions.
        </p>

        {/* Line 2 — green/teal, 30px */}
        <p
          className="mb-8"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 400,
            fontSize: '30px',
            lineHeight: '1.25em',
            color: 'rgb(66, 196, 160)',
          }}
        >
          41% Lift In Revenue. Zero Extra Traffic.
        </p>

        {/* Pill callout */}
        <div className="flex justify-center mb-4">
          <div
            className="px-10 py-3"
            style={{
              borderRadius: '50px',
              background: 'linear-gradient(rgb(223, 222, 255), rgb(223, 222, 255))',
              maxWidth: '620px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-outfit)',
                fontWeight: 700,
                fontSize: '26px',
                lineHeight: '1.25em',
                color: 'rgb(35, 34, 69)',
              }}
            >
              Extra Money Spent On Ads?
            </p>
          </div>
        </div>

        {/* Zero. None. Not A Penny. — 54px emotional release */}
        <h2
          className="mb-10"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 900,
            fontSize: '54px',
            lineHeight: '1.25em',
            color: 'rgb(35, 34, 69)',
          }}
        >
          Zero. None. Not A Penny.
        </h2>

        {/* Sub-copy */}
        <p
          className="mb-2"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 700,
            fontSize: '30px',
            lineHeight: '1.25em',
            color: 'rgb(35, 34, 69)',
          }}
        >
          Take A Look For Yourself:
        </p>

        {/* Underline image */}
        <div className="flex justify-center mb-4">
          <img
            src="/images/VLF-FE-08-Image-04.png"
            alt=""
            style={{ maxWidth: '320px', width: '100%' }}
          />
        </div>

        {/* Bridge copy — light weight, 22px */}
        <p
          className="mx-auto mb-14"
          style={{
            fontFamily: 'var(--font-outfit)',
            fontWeight: 300,
            fontSize: '22px',
            lineHeight: '1.25em',
            color: 'rgb(6, 6, 42)',
            maxWidth: '760px',
          }}
        >
          The Same AI Personalisation Technology That Turned 3,847 Visitors Into 2,219 Conversions — Without Changing The Traffic Source Or Spending A Single Dollar On Ads.
        </p>

        {/* Image block — brush bg + proof screenshot + arrows */}
        <div className="relative w-full max-w-4xl mx-auto">

          {/* Left dashed arrow */}
          <img
            src="/images/PP-FE-10-Image-06.png"
            alt=""
            className="absolute hidden sm:block"
            style={{ width: '120px', left: '-50px', top: '30px', zIndex: 2 }}
          />

          {/* Right dashed arrow */}
          <img
            src="/images/PP-FE-11-Image-07.png"
            alt=""
            className="absolute hidden sm:block"
            style={{ width: '120px', right: '-50px', top: '30px', zIndex: 2 }}
          />

          {/* Purple brush stroke behind proof image */}
          <div className="relative">
            <img
              src="/images/PP-FE-66-Image-40.png"
              alt=""
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ zIndex: 1 }}
            />
            <img
              src="/images/PP_NewProof01-1024x463.png"
              alt="PagePersona real results — 3,847 visitors, 2,219 conversions"
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
