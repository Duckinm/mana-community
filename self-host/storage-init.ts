import {
  HeadBucketCommand,
  PutBucketCorsCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const storage = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

for (let attempt = 0; ; attempt++) {
  try {
    await Promise.all(['mana', 'mana-public'].map((Bucket) => storage.send(new HeadBucketCommand({ Bucket }))))
    break
  } catch (error) {
    if (attempt === 29) throw error
    await Bun.sleep(1000)
  }
}

await storage.send(new PutBucketPolicyCommand({
  Bucket: 'mana-public',
  Policy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [{
      Effect: 'Allow',
      Principal: '*',
      Action: 's3:GetObject',
      Resource: 'arn:aws:s3:::mana-public/*',
    }],
  }),
}))

for (const Bucket of ['mana', 'mana-public']) {
  await storage.send(new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [{
        AllowedOrigins: [process.env.WEB_URL!],
        AllowedMethods: ['GET', 'HEAD', 'PUT'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      }],
    },
  }))
}

console.log('Storage ready: private mana bucket and public object reads in mana-public.')
