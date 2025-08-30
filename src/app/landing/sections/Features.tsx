import { Container, Section, Grid, Card, CardHeader, CardContent } from '../design-system/components'
import { Heading, Text } from '../design-system/typography'

const features = [
  {
    title: 'Lightning Fast',
    description: 'Optimized performance that delivers results in milliseconds.',
    icon: '⚡',
  },
  {
    title: 'Secure by Default',
    description: 'Enterprise-grade security with end-to-end encryption.',
    icon: '🔒',
  },
  {
    title: 'Scalable Infrastructure',
    description: 'Grows with your business from startup to enterprise.',
    icon: '📈',
  },
  {
    title: 'Developer Friendly',
    description: 'Clean APIs and comprehensive documentation.',
    icon: '💻',
  },
  {
    title: 'Real-time Analytics',
    description: 'Monitor your metrics with live dashboards.',
    icon: '📊',
  },
  {
    title: '24/7 Support',
    description: 'Get help whenever you need it from our expert team.',
    icon: '🛟',
  },
]

export function Features() {
  return (
    <Section padding="2xl" background="gray">
      <Container>
        <div className="text-center mb-16">
          <Heading as="h2" className="text-neutral-900 mb-4">
            Everything You Need to Succeed
          </Heading>
          <Text variant="lead" className="text-neutral-600 max-w-2xl mx-auto">
            Powerful features designed to help you build, scale, and manage your applications with ease.
          </Text>
        </div>
        
        <Grid cols={3} gap="lg">
          {features.map((feature, index) => (
            <Card key={index} hover shadow="sm">
              <CardHeader>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <Heading as="h3" className="text-xl text-neutral-900">
                  {feature.title}
                </Heading>
              </CardHeader>
              <CardContent>
                <Text className="text-neutral-600">
                  {feature.description}
                </Text>
              </CardContent>
            </Card>
          ))}
        </Grid>
      </Container>
    </Section>
  )
}