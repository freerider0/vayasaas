import { Container, Button, Flex } from '../design-system/components'
import { Heading, Text } from '../design-system/typography'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
      <Container maxWidth="xl" className="py-20">
        <div className="max-w-3xl">
          <Heading as="h1" className="text-neutral-900 mb-6">
            Build Something
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600"> Amazing</span>
          </Heading>
          
          <Text variant="lead" className="text-neutral-600 mb-8 max-w-2xl">
            Transform your ideas into reality with our powerful platform. 
            Start building today and join thousands of creators worldwide.
          </Text>
          
          <Flex gap="md" className="mb-12">
            <Button size="lg" variant="primary">
              Get Started Free
            </Button>
            <Button size="lg" variant="outline">
              View Demo
            </Button>
          </Flex>
          
          <Flex gap="lg" className="pt-8 border-t border-neutral-200">
            <div>
              <Text weight="bold" className="text-2xl text-neutral-900">10k+</Text>
              <Text variant="small" className="text-neutral-600">Active Users</Text>
            </div>
            <div>
              <Text weight="bold" className="text-2xl text-neutral-900">99.9%</Text>
              <Text variant="small" className="text-neutral-600">Uptime</Text>
            </div>
            <div>
              <Text weight="bold" className="text-2xl text-neutral-900">24/7</Text>
              <Text variant="small" className="text-neutral-600">Support</Text>
            </div>
          </Flex>
        </div>
      </Container>
      
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neutral-300 to-transparent" />
    </section>
  )
}