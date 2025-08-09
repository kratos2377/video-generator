# MinIO Setup Guide

This guide explains how to set up MinIO for local development and testing.

## What Changed

The S3Service has been updated to support both AWS S3 (production) and MinIO (local development):

- **Automatic Detection**: The service detects MinIO mode when `MINIO_ENDPOINT` is set in environment variables
- **Flexible Configuration**: Falls back to AWS credentials if MinIO credentials aren't provided
- **URL Generation**: Automatically generates correct URLs for MinIO or AWS S3 based on configuration

## Quick Start with Docker

1. **Start MinIO using Docker Compose** (recommended):
   ```bash
   # Add this to your existing docker-compose.yml or create a new one
   docker-compose up -d minio
   ```

2. **Or run MinIO directly with Docker**:
   ```bash
   docker run -d \
     --name minio \
     -p 9000:9000 \
     -p 9001:9001 \
     -e "MINIO_ROOT_USER=minioadmin" \
     -e "MINIO_ROOT_PASSWORD=minioadmin" \
     -v minio_data:/data \
     minio/minio server /data --console-address ":9001"
   ```

## Environment Configuration

Update your `.env` file with MinIO settings:

```env
# MinIO Configuration (for local development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=movie-generator-chats

# AWS S3 Configuration (keep for production)
# AWS_ACCESS_KEY_ID=your_aws_access_key
# AWS_SECRET_ACCESS_KEY=your_aws_secret_key
# AWS_REGION=us-east-1
# AWS_S3_BUCKET_NAME=movie-generator-chats
```

## Create Bucket

1. **Access MinIO Console**: http://localhost:9001
2. **Login**: minioadmin / minioadmin
3. **Create Bucket**: Create a bucket named `movie-generator-chats` (or whatever you set in MINIO_BUCKET_NAME)

## Testing

1. **Start your application**:
   ```bash
   npm run start:dev
   ```

2. **Verify MinIO Integration**: Check the logs for MinIO-related messages
3. **Upload Test**: Try uploading a file through your application
4. **Check MinIO Console**: Verify files appear in the MinIO console

## Switching Between MinIO and AWS S3

- **For Local Development**: Set `MINIO_ENDPOINT` in your `.env` file
- **For Production**: Remove or comment out `MINIO_ENDPOINT` to use AWS S3

The service automatically detects which storage backend to use based on the presence of the `MINIO_ENDPOINT` environment variable.

## Troubleshooting

### Connection Issues
- Ensure MinIO is running on the correct port (9000)
- Check firewall settings
- Verify Docker container is healthy

### Bucket Access
- Make sure the bucket exists in MinIO
- Verify access credentials are correct
- Check bucket policies if needed

### URL Generation
- MinIO URLs: `http://localhost:9000/bucket-name/file-key`
- AWS S3 URLs: `https://bucket-name.s3.amazonaws.com/file-key`
