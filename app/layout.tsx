import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            html {
              font-family: ${GeistSans.style.fontFamily};
            }
            
            :root {
              --font-sans: ${GeistSans.variable};
              --font-mono: ${GeistMono.variable};
            }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
