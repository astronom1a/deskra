import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../lib/useTheme'

export default function Settings() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark',  label: 'Dark',  icon: Moon },
  ]

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Atur preferensi tampilan aplikasi.</p>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center gap-3 mb-4">
          <Monitor size={18} className="text-primary-600 dark:text-primary-300" />
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Tampilan</h2>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Mode Tema</p>
        <div className="flex gap-2">
          {options.map(opt => {
            const Icon = opt.icon
            const active = theme === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  active
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                <Icon size={16} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
