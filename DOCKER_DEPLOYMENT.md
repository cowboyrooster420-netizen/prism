# 🔥 Prism Hot Token System - Docker Deployment Guide

Complete Docker deployment guide for the Prism Multi-Tier Hot Token Detection System.

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- `.env` file with required environment variables

## ⚙️ Environment Setup

Create a `.env` file in the project root:

```bash
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required - Birdeye API
BIRDEYE_API_KEY=your_birdeye_api_key
NEXT_PUBLIC_BIRDEYE_API_KEY=your_birdeye_api_key

# Optional - Email Notifications (for production)
NOTIFICATION_EMAIL=your-email@domain.com
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## 🚀 Quick Start

### 1. Development Deployment

```bash
# Clone and setup
git clone <your-repo>
cd prism

# Create logs directory
mkdir -p logs

# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f prism-hot-tokens
```

### 2. Production Deployment

```bash
# Use the deployment script
./docker-scripts/deploy.sh

# Or manually:
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📊 Management Commands

### Service Management

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart prism-hot-tokens

# View service status
docker-compose ps

# View logs
docker-compose logs -f prism-hot-tokens

# Follow logs in real-time
docker-compose logs --tail=100 -f prism-hot-tokens
```

### Monitoring

```bash
# Quick status check
./docker-scripts/monitor.sh

# Continuous monitoring
./docker-scripts/monitor.sh --watch

# Full system status
./docker-scripts/monitor.sh --full

# View logs only
./docker-scripts/monitor.sh --logs

# Check disk usage
./docker-scripts/monitor.sh --disk
```

### Backup & Recovery

```bash
# Create backup
./docker-scripts/backup.sh

# View available backups
ls -la backups/

# Restore from backup (example)
tar -xzf backups/config_20231201_120000.tar.gz
```

## 🔍 System Status

### Health Checks

The system includes built-in health checks:

```bash
# Check Docker health status
docker inspect prism-hot-tokens --format='{{.State.Health.Status}}'

# Check system status from within container
docker-compose exec prism-hot-tokens tsx crawler/scripts/prism_orchestrator.ts --status

# Check individual services
docker-compose exec prism-hot-tokens tsx crawler/scripts/hotness_calculator.ts --stats
```

### Resource Monitoring

```bash
# Monitor resource usage
docker stats prism-hot-tokens

# Check container logs for errors
docker-compose logs prism-hot-tokens | grep ERROR

# View system metrics
docker system df
```

## 🏗️ Architecture

### Services

1. **prism-hot-tokens**: Main application container
   - Runs the orchestrator and all sub-services
   - Collects OHLCV data for multiple timeframes
   - Calculates hotness scores
   - Manages tier assignments

2. **watchtower**: Auto-update service
   - Monitors for image updates
   - Automatically restarts with new versions
   - Sends notifications (in production)

3. **redis** (production only): Caching layer
   - Caches frequently accessed data
   - Improves performance

### Data Persistence

- **Logs**: `./logs` → `/app/logs`
- **Database**: External Supabase instance
- **Redis data**: Docker volume (production)

## 🛠️ Troubleshooting

### Common Issues

1. **Container won't start**
   ```bash
   # Check logs for errors
   docker-compose logs prism-hot-tokens
   
   # Verify environment variables
   docker-compose config
   
   # Check disk space
   df -h
   ```

2. **Health check failing**
   ```bash
   # Run status check manually
   docker-compose exec prism-hot-tokens tsx crawler/scripts/prism_orchestrator.ts --status
   
   # Check database connectivity
   docker-compose exec prism-hot-tokens node -e "
   const { createClient } = require('@supabase/supabase-js');
   const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
   client.from('tokens').select('count()').then(console.log).catch(console.error);
   "
   ```

3. **High memory usage**
   ```bash
   # Check memory stats
   docker stats prism-hot-tokens
   
   # Restart container
   docker-compose restart prism-hot-tokens
   
   # Adjust memory limits in docker-compose.yml
   ```

4. **API rate limiting**
   ```bash
   # Check for rate limit errors in logs
   docker-compose logs prism-hot-tokens | grep -i "rate limit"
   
   # Verify API key is set
   docker-compose exec prism-hot-tokens env | grep BIRDEYE
   ```

### Performance Tuning

1. **Adjust resource limits**
   ```yaml
   # In docker-compose.yml
   deploy:
     resources:
       limits:
         memory: 4G      # Increase if needed
         cpus: '2.0'     # Increase for better performance
   ```

2. **Optimize collection intervals**
   ```bash
   # Edit service configurations in src/lib/tierManager.ts
   # Adjust update frequencies based on your needs
   ```

3. **Database optimization**
   ```sql
   -- Run in Supabase SQL editor
   VACUUM ANALYZE token_ohlcv_history;
   REINDEX TABLE token_ohlcv_history;
   ```

## 🔒 Security

### Best Practices

1. **Environment Variables**
   - Never commit `.env` files
   - Use Docker secrets in production
   - Rotate API keys regularly

2. **Network Security**
   - Use custom Docker networks
   - Limit exposed ports
   - Consider using Traefik or nginx proxy

3. **Container Security**
   - Regular image updates via Watchtower
   - Non-root user in containers
   - Read-only filesystem where possible

### Example Production Setup

```bash
# Create Docker secrets
echo "your_supabase_key" | docker secret create supabase_key -
echo "your_birdeye_key" | docker secret create birdeye_key -

# Use secrets in docker-compose.yml
secrets:
  - supabase_key
  - birdeye_key
```

## 📈 Scaling

### Horizontal Scaling

For high-volume deployments:

1. **Multiple Regions**
   ```bash
   # Deploy in multiple regions
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.us-east.yml up -d
   ```

2. **Load Balancing**
   ```yaml
   # Add nginx load balancer
   nginx:
     image: nginx:alpine
     volumes:
       - ./nginx.conf:/etc/nginx/nginx.conf
     ports:
       - "80:80"
   ```

3. **Database Sharding**
   - Partition by token address
   - Use read replicas for queries
   - Implement caching layers

## 📞 Support

### Getting Help

1. **Check logs first**
   ```bash
   ./docker-scripts/monitor.sh --full
   ```

2. **Verify system status**
   ```bash
   docker-compose exec prism-hot-tokens tsx crawler/scripts/prism_orchestrator.ts --status
   ```

3. **Create issue with:**
   - Docker version: `docker --version`
   - Compose version: `docker-compose --version`
   - System logs
   - Error messages

### Maintenance Schedule

- **Daily**: Check system status
- **Weekly**: Review logs and performance
- **Monthly**: Update images and clean old data
- **Quarterly**: Review and optimize configurations

---

## 🎯 Summary

This Docker deployment provides:
- ✅ Production-ready containerization
- ✅ Automatic restarts and health checks
- ✅ Log management and monitoring
- ✅ Backup and recovery procedures
- ✅ Security best practices
- ✅ Scaling capabilities

The system will automatically:
- Calculate hotness scores every minute
- Collect multi-tier OHLCV data
- Manage tier promotions/demotions
- Clean up old data
- Restart on failures
- Update automatically (with Watchtower)