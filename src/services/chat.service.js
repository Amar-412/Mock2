import Team from '../models/team.model.js';
import TeamMembership from '../models/teamMembership.model.js';
import ChatMessage from '../models/chatMessage.model.js';
import Event from '../models/event.model.js';
import userModel from '../models/user.model.js';

export async function verifyTeamChatAccess(userId, teamId) {
  const team = await Team.findById(teamId).lean();
  if (!team) {
    throw new Error('Team not found');
  }

  const membership = await TeamMembership.findOne({ teamId, userId }).lean();
  if (!membership) {
    throw new Error('Forbidden: You are not a registered member of this team');
  }

  // Pending invitations do NOT provide chat access
  // Though TeamMembership typically signifies accepted members, if there's a status, we should check it.
  // Wait, the requirements state: "Pending invitations do NOT provide chat access."
  // TeamInvitation is a separate model for pending invites. TeamMembership is for actual members.
  // So existence in TeamMembership is sufficient.

  const event = await Event.findById(team.eventId).lean();
  if (!event) {
    throw new Error('Event not found');
  }

  return { team, event, membership };
}

export async function getTeamMessages(teamId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const messages = await ChatMessage.find({ teamId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', 'username email role')
    .lean();

  return messages.reverse().map(formatMessageResponse);
}

export async function saveMessage(data) {
  const message = await ChatMessage.create(data);
  const populated = await ChatMessage.findById(message._id).populate('senderId', 'username email role').lean();
  return formatMessageResponse(populated);
}

export function formatMessageResponse(msg) {
  const response = {
    id: msg._id,
    eventId: msg.eventId,
    teamId: msg.teamId,
    sender: {
      id: msg.senderId?._id || msg.senderId,
      name: msg.senderId?.username || 'Unknown',
    },
    type: msg.type,
    createdAt: msg.createdAt,
  };

  if (msg.type === 'TEXT') {
    response.message = msg.message;
  } else if (msg.file) {
    response.message = msg.message || ''; // Captions allowed
    response.file = {
      filename: msg.file.filename,
      mimeType: msg.file.mimeType,
      size: msg.file.size,
    };
  }

  return response;
}
