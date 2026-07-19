import { useState } from 'react'
import { creatorPacks } from './data'
import { mergePack } from './pack'

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string | null>(null)

  const finish = () => {
    if (name.trim()) {
      localStorage.setItem('pm.user.name', JSON.stringify(name.trim()))
    }
    const pack = creatorPacks.find((p) => p.pack.name === picked)
    if (pack) mergePack(pack.pack)
    localStorage.setItem('pm.onboarded', 'true')
    onDone()
    if (pack) location.reload()
  }

  return (
    <div className="onboard">
      <div className="onboard-box">
        {step === 0 && (
          <>
            <div className="onboard-logo">
              Planera<span>Mera</span>
            </div>
            <h2>Disciplin idag, frihet imorgon.</h2>
            <p>
              Planering, rutiner, vanor, fokus, hälsa och ekonomi — allt på ett
              ställe. All data stannar på din enhet.
            </p>
            <button className="btn onboard-btn" onClick={() => setStep(1)}>
              Kom igång
            </button>
          </>
        )}
        {step === 1 && (
          <>
            <h2>Vad heter du?</h2>
            <p>Så kan appen hälsa på dig ordentligt.</p>
            <input
              value={name}
              placeholder="Ditt namn…"
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
            />
            <button className="btn onboard-btn" onClick={() => setStep(2)}>
              Nästa
            </button>
            <button className="onboard-skip" onClick={() => setStep(2)}>
              Hoppa över
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Välj ett startpaket</h2>
            <p>
              Färdiga upplägg med vanor och rutiner — du kan ändra allt senare.
            </p>
            <div className="onboard-packs">
              {creatorPacks.map((p) => (
                <button
                  key={p.pack.name}
                  className={`onboard-pack ${picked === p.pack.name ? 'on' : ''}`}
                  onClick={() =>
                    setPicked(picked === p.pack.name ? null : p.pack.name)
                  }
                >
                  <span className="op-emoji">{p.emoji}</span>
                  <span className="op-name">{p.pack.name}</span>
                </button>
              ))}
            </div>
            <button className="btn onboard-btn" onClick={finish}>
              {picked ? `Kör med ${picked}!` : 'Börja från noll'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
