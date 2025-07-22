import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { CreditCard } from 'lucide-react';

const BorrowerList = ({ users, handleUserSelect, renderDecisionBadge }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Borrower</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Credit Score</TableHead>
        <TableHead>Risk Level</TableHead>
        <TableHead>Decision</TableHead>
        <TableHead>Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {users.map((user) => (
        <TableRow key={user._id}>
          <TableCell>
            <div className="font-medium">{user.name || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">{user.email || 'N/A'}</div>
          </TableCell>
          <TableCell>
            <Badge variant="outline">
              {user.status || 'inactive'}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
              {user.creditScore || 'N/A'}
            </div>
          </TableCell>
          <TableCell>
            <Badge variant={
              user.lendingDecision?.riskFlags?.highDTI || 
              user.lendingDecision?.riskFlags?.hasDefaults ? "destructive" : 
              user.lendingDecision?.riskFlags?.hasMissedPayments ? "warning" : "default"
            }>
              {user.lendingDecision?.riskFlags?.highDTI || 
               user.lendingDecision?.riskFlags?.hasDefaults ? "High Risk" : 
               user.lendingDecision?.riskFlags?.hasMissedPayments ? "Medium Risk" : "Low Risk"}
            </Badge>
          </TableCell>
          <TableCell>
            <div className="flex items-center">
              {renderDecisionBadge(user.lendingDecision?.decision || 'Review')}
            </div>
          </TableCell>
          <TableCell>
            <Button size="sm" onClick={() => handleUserSelect(user)}>Review</Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default BorrowerList; 