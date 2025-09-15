import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserActivityService } from './user-activity.service';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('user-activity')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('user-activity')
export class UserActivityController {
  constructor(private readonly userActivityService: UserActivityService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user activity log with pagination and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Activity log retrieved successfully',
  })
  async getUserActivities(@Request() req, @Query() query: ActivityQueryDto) {
    return this.userActivityService.findUserActivities('default-user' // Default since auth disabled, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user activity statistics' })
  @ApiResponse({
    status: 200,
    description: 'Activity statistics retrieved successfully',
  })
  async getActivityStats(@Request() req) {
    return this.userActivityService.getActivityStats('default-user' // Default since auth disabled);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Generate user activity summary from user data' })
  @ApiResponse({
    status: 200,
    description: 'Activity summary generated successfully',
  })
  async getActivitySummary(@Request() req) {
    return this.userActivityService.generateUserActivitySummary('default-user' // Default since auth disabled);
  }
}
