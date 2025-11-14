import { useEffect } from 'react'

import { siteConfig } from '@/config/site'

type MetaSelector =
  | 'description'
  | 'keywords'
  | 'og:title'
  | 'og:description'
  | 'og:url'
  | 'twitter:title'
  | 'twitter:description'

const metaSelectors: Record<MetaSelector, string> = {
  description: 'meta[name="description"]',
  keywords: 'meta[name="keywords"]',
  'og:title': 'meta[property="og:title"]',
  'og:description': 'meta[property="og:description"]',
  'og:url': 'meta[property="og:url"]',
  'twitter:title': 'meta[name="twitter:title"]',
  'twitter:description': 'meta[name="twitter:description"]',
}

const canonicalSelector = 'link[rel="canonical"]'

const isMetaElement = (element: Element | null): element is HTMLMetaElement =>
  element instanceof HTMLMetaElement

const isLinkElement = (element: Element | null): element is HTMLLinkElement =>
  element instanceof HTMLLinkElement

export type SeoOptions = {
  title?: string
  description?: string
  keywords?: string | string[]
  canonical?: string
  ogTitle?: string
  ogDescription?: string
  ogUrl?: string
  twitterTitle?: string
  twitterDescription?: string
}

export function useSeo(options: SeoOptions): void {
  const keywordValue = Array.isArray(options.keywords) ? options.keywords.join(', ') : options.keywords
  const canonicalUrl = options.canonical
  const computedOgUrl = options.ogUrl ?? canonicalUrl

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const cleanups: Array<() => void> = []

    if (options.title) {
      const previousTitle = document.title
      const nextTitle = options.title.includes(siteConfig.name)
        ? options.title
        : `${options.title} | ${siteConfig.name}`
      document.title = nextTitle
      cleanups.push(() => {
        document.title = previousTitle
      })
    }

    const setMeta = (key: MetaSelector, value: string | undefined) => {
      if (!value) {
        return
      }

      const element = document.head.querySelector(metaSelectors[key])

      if (!isMetaElement(element)) {
        return
      }

      const previous = element.content
      element.content = value
      cleanups.push(() => {
        element.content = previous
      })
    }

    setMeta('description', options.description)
    setMeta('keywords', keywordValue)
    setMeta('og:title', options.ogTitle ?? options.title)
    setMeta('og:description', options.ogDescription ?? options.description)
    setMeta('og:url', computedOgUrl)
    setMeta('twitter:title', options.twitterTitle ?? options.title)
    setMeta('twitter:description', options.twitterDescription ?? options.description)

    if (canonicalUrl) {
      const canonicalElement = document.head.querySelector(canonicalSelector)
      if (isLinkElement(canonicalElement)) {
        const previousHref = canonicalElement.href
        canonicalElement.href = canonicalUrl
        cleanups.push(() => {
          canonicalElement.href = previousHref
        })
      }
    }

    return () => {
      cleanups.forEach(cleanup => {
        cleanup()
      })
    }
  }, [
    canonicalUrl,
    computedOgUrl,
    keywordValue,
    options.description,
    options.ogDescription,
    options.ogTitle,
    options.title,
    options.twitterDescription,
    options.twitterTitle,
  ])
}
