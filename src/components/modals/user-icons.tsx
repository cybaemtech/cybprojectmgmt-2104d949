import { User, Users, UserCheck, UserX, UserPlus, UserMinus } from "lucide-react";

export const AdminIcon = () => <User className="h-4 w-4 text-red-500" />;
export const MemberIcon = () => <Users className="h-4 w-4 text-blue-500" />;
export const ViewerIcon = () => <UserCheck className="h-4 w-4 text-green-500" />;
export const InactivateIcon = () => <UserX className="h-4 w-4 text-orange-500" />;
export const ActivateIcon = () => <UserPlus className="h-4 w-4 text-green-500" />;
export const InactiveIcon = () => <UserMinus className="h-4 w-4 text-gray-500" />;
