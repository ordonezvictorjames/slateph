'use client'

import { NatureButton } from '@/components/ui/nature-button'
import { BookCard, BookCardHeader, BookCardContent, BookCardFooter } from '@/components/ui/book-card'
import { Badge } from '@/components/ui/badge'
import { PlantDivider } from '@/components/ui/plant-divider'
import { Alert } from '@/components/ui/alert'
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton'

export default function DesignTestPage() {
  return (
    <div className="min-h-screen bg-dust-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-5xl font-display font-bold text-hunter-900 mb-4">
            🌿 Books & Plants Design System
          </h1>
          <p className="text-xl text-pine-600">
            A natural, earthy design for learning - Inspired by ferns, sage, and dusty tomes
          </p>
        </div>

        <PlantDivider variant="vine" />

        {/* Color Palette */}
        <section>
          <h2 className="text-3xl font-display font-bold text-hunter-900 mb-6">Earthy Color Palette</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Fern Green (Primary)</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 rounded-xl bg-fern-${shade} border border-dust-300`}></div>
                    <p className="text-xs mt-1 text-pine-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Hunter Green (Deep)</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 rounded-xl bg-hunter-${shade} border border-dust-300`}></div>
                    <p className="text-xs mt-1 text-pine-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Pine Teal (Accent)</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 rounded-xl bg-pine-${shade} border border-dust-300`}></div>
                    <p className="text-xs mt-1 text-pine-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Dry Sage (Soft)</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 rounded-xl bg-sage-${shade} border border-dust-300`}></div>
                    <p className="text-xs mt-1 text-pine-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Dust Grey (Neutral)</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                  <div key={shade} className="text-center">
                    <div className={`h-16 rounded-xl bg-dust-${shade} border border-dust-300`}></div>
                    <p className="text-xs mt-1 text-pine-600">{shade}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <PlantDivider variant="leaf" />

        {/* Buttons */}
        <section>
          <h2 className="text-3xl font-display font-bold text-hunter-900 mb-6">Buttons</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Variants</h3>
              <div className="flex flex-wrap gap-4">
                <NatureButton variant="leaf">Fern Button</NatureButton>
                <NatureButton variant="earth">Dust Button</NatureButton>
                <NatureButton variant="wood">Sage Button</NatureButton>
                <NatureButton variant="outline">Outline Button</NatureButton>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-4">
                <NatureButton size="sm">Small</NatureButton>
                <NatureButton size="md">Medium</NatureButton>
                <NatureButton size="lg">Large</NatureButton>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-4">
                <NatureButton 
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Add Course
                </NatureButton>
                <NatureButton 
                  variant="earth"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  }
                  iconPosition="right"
                >
                  View Details
                </NatureButton>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">States</h3>
              <div className="flex flex-wrap gap-4">
                <NatureButton loading>Loading...</NatureButton>
                <NatureButton disabled>Disabled</NatureButton>
              </div>
            </div>
          </div>
        </section>

        <PlantDivider variant="simple" />

        {/* Cards */}
        <section>
          <h2 className="text-3xl font-display font-bold text-hunter-900 mb-6">Book Cards</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BookCard hover>
              <BookCardHeader 
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                }
              >
                Course Title
              </BookCardHeader>
              <BookCardContent>
                <p className="text-sm mb-3">
                  This is a sample course card with the book theme. It has a soft shadow and hover effect.
                </p>
                <div className="flex gap-2">
                  <Badge variant="leaf">Active</Badge>
                  <Badge variant="wood">12 Modules</Badge>
                </div>
              </BookCardContent>
              <BookCardFooter>
                <NatureButton size="sm" className="w-full">View Course</NatureButton>
              </BookCardFooter>
            </BookCard>

            <BookCard hover spine>
              <BookCardHeader 
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                With Book Spine
              </BookCardHeader>
              <BookCardContent>
                <p className="text-sm mb-3">
                  This card has a book spine effect on the left side, giving it a more book-like appearance.
                </p>
                <div className="flex gap-2">
                  <Badge variant="success">Completed</Badge>
                  <Badge variant="info">8 Lessons</Badge>
                </div>
              </BookCardContent>
              <BookCardFooter>
                <NatureButton size="sm" variant="earth" className="w-full">Continue</NatureButton>
              </BookCardFooter>
            </BookCard>

            <BookCard>
              <BookCardHeader>
                No Hover Effect
              </BookCardHeader>
              <BookCardContent>
                <p className="text-sm mb-3">
                  This card doesn't have hover effects, useful for static content or disabled states.
                </p>
                <div className="flex gap-2">
                  <Badge variant="warning">Draft</Badge>
                  <Badge variant="earth">Coming Soon</Badge>
                </div>
              </BookCardContent>
            </BookCard>
          </div>
        </section>

        <PlantDivider variant="vine" />

        {/* Badges */}
        <section>
          <h2 className="text-3xl font-display font-bold text-hunter-900 mb-6">Badges</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="leaf">Fern</Badge>
                <Badge variant="wood">Sage</Badge>
                <Badge variant="earth">Dust</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-pine-800 mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
              </div>
            </div>
          </div>
        </section>

        <PlantDivider variant="leaf" />

        {/* Alerts */}
        <section>
          <h2 className="text-3xl font-display font-bold text-hunter-900 mb-6">Alerts</h2>
          
          <div className="space-y-4">
            <Alert variant="success" title="Success!">
              Your course has been created successfully.
            </Alert>

            <Alert variant="warning" title="Warning">
              This action cannot be undone. Please proceed with caution.
            </Alert>

            <Alert variant="error" title="Error">
              Failed to save changes. Please try again.
            </Alert>

            <Alert variant="info" title="Information">
              New features have been added to the platform.
            </Alert>

            <Alert variant="leaf" title="Welcome! 🌿">
              Start your learning journey with our nature-inspired LMS.
            </Alert>
          </div>
        </section>

        <PlantDivider variant="simple" />

        {/* Loading States */}
        <section>
          <h2 className="text-3xl font-display font-bold text-hunter-900 mb-6">Loading States</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>

        <PlantDivider variant="vine" />

        {/* Typography */}
        <section>
          <h2 className="text-3xl font-display font-bold text-hunter-900 mb-6">Typography</h2>
          
          <div className="space-y-4 bg-white p-6 rounded-xl border border-dust-200">
            <h1 className="text-5xl font-display font-bold text-hunter-900">Heading 1</h1>
            <h2 className="text-4xl font-display font-bold text-hunter-900">Heading 2</h2>
            <h3 className="text-3xl font-display font-bold text-hunter-900">Heading 3</h3>
            <h4 className="text-2xl font-display font-bold text-hunter-900">Heading 4</h4>
            <h5 className="text-xl font-display font-bold text-hunter-900">Heading 5</h5>
            <h6 className="text-lg font-display font-bold text-hunter-900">Heading 6</h6>
            
            <PlantDivider variant="simple" />
            
            <p className="text-base text-pine-700">
              This is body text using the Inter font family. It's clean, readable, and perfect for educational content.
            </p>
            <p className="text-sm text-pine-600">
              This is smaller text, often used for captions or secondary information.
            </p>
            <p className="text-xs text-pine-500">
              This is extra small text for labels and metadata.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-pine-500">🌿 Slate LMS - Earthy Books & Plants Design System 📚</p>
        </div>
      </div>
    </div>
  )
}
