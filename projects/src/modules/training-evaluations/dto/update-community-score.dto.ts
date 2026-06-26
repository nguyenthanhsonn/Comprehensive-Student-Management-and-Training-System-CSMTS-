import { IsIn } from 'class-validator';

export const LAW_COMPLIANCE_LEVELS = [
  'GOOD_WITH_REWARD',
  'GOOD',
  'AVERAGE',
  'VIOLATED',
] as const;
export type LawComplianceLevel = (typeof LAW_COMPLIANCE_LEVELS)[number];

export const VOLUNTEER_ACTIVITY_LEVELS = [
  'ACTIVE_WITH_REWARD',
  'ACTIVE',
  'PARTICIPATED',
  'NOT_PARTICIPATED',
] as const;
export type VolunteerActivityLevel = (typeof VOLUNTEER_ACTIVITY_LEVELS)[number];

export const COMMUNITY_RELATIONSHIP_LEVELS = [
  'GOOD',
  'AVERAGE',
  'BAD',
] as const;
export type CommunityRelationshipLevel =
  (typeof COMMUNITY_RELATIONSHIP_LEVELS)[number];

export class UpdateCommunityScoreDto {
  @IsIn(LAW_COMPLIANCE_LEVELS)
  lawComplianceLevel: LawComplianceLevel;

  @IsIn(VOLUNTEER_ACTIVITY_LEVELS)
  volunteerActivityLevel: VolunteerActivityLevel;

  @IsIn(COMMUNITY_RELATIONSHIP_LEVELS)
  communityRelationshipLevel: CommunityRelationshipLevel;
}
