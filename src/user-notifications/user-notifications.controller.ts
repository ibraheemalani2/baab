import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserNotificationsService } from './user-notifications.service';
import {
  NotificationQueryDto,
  UpdateNotificationDto,
  CreateNotificationDto,
} from './dto/notification-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('user-notifications')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('user-notifications')
export class UserNotificationsController {
  constructor(
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification (admin use)' })
  @ApiResponse({
    status: 201,
    description: 'Notification created successfully',
  })
  async create(
    @Request() req,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    const userId = req.body?.userId || 'default-user';
    return this.userNotificationsService.createNotification(
      userId,
      createNotificationDto,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get user notifications with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async findAll(@Request() req, @Query() query: NotificationQueryDto) {
    // Get userId from query parameter or use default since auth is disabled
    const userId = query.userId || 'default-user';
    return this.userNotificationsService.findUserNotifications(
      userId,
      query,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get notification statistics' })
  @ApiResponse({
    status: 200,
    description: 'Notification statistics retrieved successfully',
  })
  async getStats(@Request() req, @Query() query: any) {
    const userId = query.userId || 'default-user';
    return this.userNotificationsService.getNotificationStats(userId);
  }

  @Get('generate')
  @ApiOperation({
    summary: 'Generate notifications based on user data',
    description:
      'Useful for demo purposes - generates notifications from user activities',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications generated successfully',
  })
  async generateNotifications(@Request() req, @Query() query: any) {
    const userId = query.userId || 'default-user';
    return this.userNotificationsService.generateUserNotifications(userId);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req, @Query() query: any) {
    const userId = query.userId || req.body?.userId || 'default-user';
    return this.userNotificationsService.markAllAsRead(userId);
  }

  @Delete('clear-read')
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({ status: 200, description: 'All read notifications deleted' })
  async deleteAllRead(@Request() req, @Query() query: any) {
    const userId = query.userId || req.body?.userId || 'default-user';
    return this.userNotificationsService.deleteAllRead(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific notification by ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your notification',
  })
  async findOne(@Param('id') id: string, @Request() req, @Query() query: any) {
    const userId = query.userId || 'default-user';
    return this.userNotificationsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update notification (mark as read/unread)' })
  @ApiResponse({
    status: 200,
    description: 'Notification updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your notification',
  })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    const userId = req.body?.userId || 'default-user';
    return this.userNotificationsService.updateNotification(
      id,
      userId,
      updateNotificationDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a specific notification' })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not your notification',
  })
  async remove(@Param('id') id: string, @Request() req, @Query() query: any) {
    const userId = query.userId || 'default-user';
    return this.userNotificationsService.deleteNotification(id, userId);
  }
}
