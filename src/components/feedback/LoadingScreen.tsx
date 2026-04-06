import { motion } from 'framer-motion'
import logoImg from '@/assets/logo-axisinova.jpeg'

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        <div className="text-4xl font-extrabold">
          <span className="gradient-text">Axis</span>
          <span className="text-foreground/70">Inova</span>
        </div>
        <p className="text-sm text-muted-foreground">Carregando sua plataforma...</p>
        <div className="w-48 h-1.5 rounded-full bg-muted overflow-hidden mx-auto">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="h-full rounded-full gradient-bg"
          />
        </div>
      </motion.div>
    </div>
  )
}
